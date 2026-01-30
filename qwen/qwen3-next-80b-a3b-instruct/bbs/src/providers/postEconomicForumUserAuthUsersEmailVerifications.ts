import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserEmailVerification";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumUserEmailVerificationCollector } from "../collectors/EconomicForumUserEmailVerificationCollector";

export async function postEconomicForumUserAuthUsersEmailVerifications(props: {
  user: UserPayload;
  body: IEconomicForumUserEmailVerification.ICreate;
}): Promise<IEconomicForumUserEmailVerification> {
  const created =
    await MyGlobal.prisma.economic_forum_user_email_verifications.create({
      data: await EconomicForumUserEmailVerificationCollector.collect({
        body: props.body,
        economicForumUsers: { id: props.user.id },
        economicForumUserSessions: { id: props.user.session_id },
      }),
    });
  return {
    value: "Email verification token request initiated successfully.",
  };
}
