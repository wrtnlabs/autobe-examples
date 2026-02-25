import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformVotingTransactionTransformer } from "../transformers/CommunityPlatformVotingTransactionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorVotingTransactionsTransactionId(props: {
  moderator: ModeratorPayload;
  transactionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVotingTransaction> {
  const transaction =
    await MyGlobal.prisma.community_platform_voting_transactions.findUniqueOrThrow(
      {
        where: { id: props.transactionId },
        ...CommunityPlatformVotingTransactionTransformer.select(),
      },
    );
  return await CommunityPlatformVotingTransactionTransformer.transform(
    transaction,
  );
}
