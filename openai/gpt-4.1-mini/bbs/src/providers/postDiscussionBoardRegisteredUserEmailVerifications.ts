import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardRegisteredUserEmailVerificationCollector } from "../collectors/DiscussionBoardRegisteredUserEmailVerificationCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardRegisteredUserEmailVerificationTransformer } from "../transformers/DiscussionBoardRegisteredUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserEmailVerifications(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserEmailVerification.ICreate;
}): Promise<IDiscussionBoardRegisteredUserEmailVerification> {
  // Validate that expiredAt is in the future by string comparison using toISOStringSafe
  const nowISO = toISOStringSafe(new Date());
  if (props.body.expiredAt <= nowISO) {
    throw new HttpException("Expiration datetime must be in the future", 400);
  }
  try {
    // Prepare create input using collector
    const data =
      await DiscussionBoardRegisteredUserEmailVerificationCollector.collect({
        body: props.body,
      });
    // Create email verification record
    const created =
      await MyGlobal.prisma.discussion_board_registered_user_email_verifications.create(
        {
          data,
          ...DiscussionBoardRegisteredUserEmailVerificationTransformer.select(),
        },
      );
    // Transform to DTO
    return await DiscussionBoardRegisteredUserEmailVerificationTransformer.transform(
      created,
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const target = (e.meta?.target ?? []) as string[];
      if (e.code === "P2002" && target.includes("token")) {
        throw new HttpException("Token already exists", 409);
      }
      if (e.code === "P2025") {
        throw new HttpException("Registered user not found", 404);
      }
    }
    throw e;
  }
}
