import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorRequestCollector } from "../collectors/DiscussionBoardAdministratorRequestCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorRequest.ICreate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  // Currently props.body.reason does not exist, so skip validation on reason
  const now = toISOStringSafe(new Date());
  const collected = await DiscussionBoardAdministratorRequestCollector.collect({
    body: props.body,
    registeredUser: { id: props.administrator.id },
  });
  const data = {
    ...collected,
    status: "pending",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies Prisma.discussion_board_administrator_requestsCreateInput;
  try {
    const created =
      await MyGlobal.prisma.discussion_board_administrator_requests.create({
        data,
      });
    return {
      id: created.id,
      registered_user_id: created.registered_user_id,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("registered_user_id")
    ) {
      throw new HttpException(
        "Administrator request already exists for this user",
        400,
      );
    }
    throw error;
  }
}
