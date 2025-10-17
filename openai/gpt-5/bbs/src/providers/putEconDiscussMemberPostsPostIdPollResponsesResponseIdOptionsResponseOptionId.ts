import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostIdPollResponsesResponseIdOptionsResponseOptionId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  responseOptionId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponseOption.IUpdate;
}): Promise<IEconDiscussPollResponseOption> {
  const { member, postId, responseId, responseOptionId, body } = props;

  // 1) Locate poll by postId
  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_post_id: true,
      question_type: true,
      allow_vote_change: true,
      start_at: true,
      end_at: true,
    },
  });
  if (!poll) throw new HttpException("Poll not found for given postId", 404);

  // 2) Locate response and ensure it belongs to the poll
  const response = await MyGlobal.prisma.econ_discuss_poll_responses.findFirst({
    where: {
      id: responseId,
      econ_discuss_poll_id: poll.id,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_poll_id: true,
      econ_discuss_user_id: true,
      status: true,
    },
  });
  if (!response)
    throw new HttpException("Poll response not found in this post", 404);

  // 3) Ownership authorization
  if (response.econ_discuss_user_id !== member.id)
    throw new HttpException("Forbidden: You do not own this response", 403);

  // 4) Response must not be terminal
  if (response.status === "withdrawn" || response.status === "invalidated")
    throw new HttpException("Conflict: Response is not modifiable", 409);

  // 5) Policy checks: allow_vote_change and time window
  if (!poll.allow_vote_change)
    throw new HttpException("Conflict: Vote changes are not allowed", 409);

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const startAt = poll.start_at ? toISOStringSafe(poll.start_at) : null;
  const endAt = poll.end_at ? toISOStringSafe(poll.end_at) : null;
  if (startAt !== null && now < startAt)
    throw new HttpException("Conflict: Poll has not started yet", 409);
  if (endAt !== null && !(now < endAt))
    throw new HttpException("Conflict: Poll has ended", 409);

  // 6) Locate the specific response-option row
  const selection =
    await MyGlobal.prisma.econ_discuss_poll_response_options.findFirst({
      where: {
        id: responseOptionId,
        econ_discuss_poll_response_id: responseId,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_poll_response_id: true,
        econ_discuss_poll_option_id: true,
        position: true,
      },
    });
  if (!selection) throw new HttpException("Response option row not found", 404);

  // 7) Validate incoming fields
  const wantsOptionChange =
    body.optionId !== undefined && body.optionId !== null;
  const wantsPositionChange =
    body.position !== undefined && body.position !== null;
  if (!wantsOptionChange && !wantsPositionChange)
    throw new HttpException("Bad Request: No updatable fields provided", 400);

  // Option change validations
  if (body.optionId !== undefined && body.optionId !== null) {
    // Ensure option belongs to the same poll
    const opt = await MyGlobal.prisma.econ_discuss_poll_options.findFirst({
      where: {
        id: body.optionId,
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!opt)
      throw new HttpException(
        "Not Found: Target option does not belong to this poll",
        404,
      );

    // Ensure no duplicate selection of same option for this response (unique constraint pre-check)
    const dup =
      await MyGlobal.prisma.econ_discuss_poll_response_options.findFirst({
        where: {
          econ_discuss_poll_response_id: responseId,
          econ_discuss_poll_option_id: body.optionId,
          deleted_at: null,
          NOT: { id: responseOptionId },
        },
        select: { id: true },
      });
    if (dup)
      throw new HttpException(
        "Conflict: Duplicate selection for the same option",
        409,
      );
  }

  // Position change validations (ranking only)
  let validatedPosition: (number & tags.Type<"int32">) | null | undefined =
    undefined;
  if (body.position !== undefined) {
    if (poll.question_type !== "ranking")
      throw new HttpException(
        "Conflict: Position is only applicable to ranking polls",
        409,
      );

    if (body.position === null)
      throw new HttpException(
        "Bad Request: Position cannot be null for ranking polls",
        400,
      );

    // Validate range 1..N where N = options count of the poll
    const optionsCount = await MyGlobal.prisma.econ_discuss_poll_options.count({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
      },
    });
    if (optionsCount <= 0)
      throw new HttpException("Conflict: Poll has no options to rank", 409);

    const posNumber = body.position; // already branded per DTO
    // 1..N check
    if (!(posNumber >= 1 && posNumber <= optionsCount))
      throw new HttpException("Conflict: Position out of allowed range", 409);

    // Ensure no duplicate position for this response
    const posDup =
      await MyGlobal.prisma.econ_discuss_poll_response_options.findFirst({
        where: {
          econ_discuss_poll_response_id: responseId,
          position: posNumber,
          deleted_at: null,
          NOT: { id: responseOptionId },
        },
        select: { id: true },
      });
    if (posDup)
      throw new HttpException("Conflict: Duplicate ranking position", 409);

    validatedPosition = posNumber;
  }

  // 8) Perform update
  try {
    const updated =
      await MyGlobal.prisma.econ_discuss_poll_response_options.update({
        where: { id: responseOptionId },
        data: {
          // Only include fields when explicitly provided and valid
          econ_discuss_poll_option_id:
            body.optionId !== undefined && body.optionId !== null
              ? body.optionId
              : undefined,
          position:
            validatedPosition !== undefined ? validatedPosition : undefined,
          updated_at: now,
        },
        select: {
          id: true,
          econ_discuss_poll_response_id: true,
          econ_discuss_poll_option_id: true,
          position: true,
          created_at: true,
          updated_at: true,
        },
      });

    return {
      id: typia.assert<string & tags.Format<"uuid">>(responseOptionId),
      responseId: typia.assert<string & tags.Format<"uuid">>(
        updated.econ_discuss_poll_response_id,
      ),
      optionId: typia.assert<string & tags.Format<"uuid">>(
        updated.econ_discuss_poll_option_id,
      ),
      position:
        updated.position === null
          ? null
          : typia.assert<number & tags.Type<"int32">>(updated.position),
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: now,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint violation (e.g., duplicate option selection)
      throw new HttpException("Conflict: Unique constraint violated", 409);
    }
    throw err;
  }
}
