import { IEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardUserEmailVerificationTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardUserEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.economic_political_discussion_board_user_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.verificationId,
          user_id: props.user.id,
        },
        ...EconomicPoliticalDiscussionBoardUserEmailVerificationTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardUserEmailVerificationTransformer.transform(
    verification,
  );
}
