import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardUserEmailVerificationAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardUserEmailVerifications(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardUserEmailVerification.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardUserEmailVerification.ISummary> {
  const { page, limit, email, status = "expired" } = props.body;
  const now = toISOStringSafe(new Date());
  const whereInput: Prisma.economic_political_discussion_board_user_email_verificationsWhereInput =
    {};
  if (status === "expired") {
    whereInput.expires_at = { lt: now };
    whereInput.verified = false;
  } else if (status === "verified") {
    whereInput.expires_at = { gt: now };
    whereInput.verified = true;
  } else if (status === "pending") {
    whereInput.expires_at = { gt: now };
    whereInput.verified = null;
  }
  if (email) {
    whereInput.user = {
      email: { contains: email },
    };
  }
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_discussion_board_user_email_verifications.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { expires_at: "asc" },
        ...EconomicPoliticalDiscussionBoardUserEmailVerificationAtSummaryTransformer.select(),
      },
    ),
    MyGlobal.prisma.economic_political_discussion_board_user_email_verifications.count(
      { where: whereInput },
    ),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalDiscussionBoardUserEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
