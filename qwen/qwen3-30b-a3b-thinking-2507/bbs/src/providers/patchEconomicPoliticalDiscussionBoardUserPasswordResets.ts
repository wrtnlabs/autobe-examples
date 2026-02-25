import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardUserPasswordResets(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardUserPasswordReset.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardUserPasswordReset.ISummary> {
  const {
    user_id,
    token,
    is_used,
    min_expires_at,
    max_expires_at,
    page = 1,
    limit = 100,
  } = props.body;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 100;
  // Build the whereInput object
  const whereInput: Prisma.economic_political_discussion_board_user_password_resetsWhereInput =
    {
      deleted_at: null,
      ...(user_id ? { user_id } : {}),
      ...(token ? { token } : {}),
      ...(is_used !== undefined ? { is_used } : {}),
      ...(min_expires_at ? { expires_at: { gte: min_expires_at } } : {}),
      ...(max_expires_at ? { expires_at: { lte: max_expires_at } } : {}),
    };
  // Count total records
  const total =
    await MyGlobal.prisma.economic_political_discussion_board_user_password_resets.count(
      {
        where: whereInput,
      },
    );
  // Get paginated data
  const data =
    await MyGlobal.prisma.economic_political_discussion_board_user_password_resets.findMany(
      {
        where: whereInput,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { created_at: "desc" },
      },
    );
  // Transform data to the required DTO structure
  const resultData = await Promise.all(
    data.map(async (item) => {
      const user =
        await MyGlobal.prisma.economic_political_discussion_board_users.findUniqueOrThrow(
          {
            where: { id: item.user_id },
            select: {
              id: true,
              role: true,
            },
          },
        );
      return {
        id: item.id,
        token: item.token,
        user: {
          id: user.id satisfies string & tags.Format<"uuid">,
          role: user.role ?? "",
        },
        expires_at: toISOStringSafe(item.expires_at),
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      };
    }),
  );
  return {
    data: resultData,
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
