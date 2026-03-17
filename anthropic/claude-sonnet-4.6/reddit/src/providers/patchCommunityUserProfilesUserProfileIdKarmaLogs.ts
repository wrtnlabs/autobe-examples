import { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfileKarmaLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityUserProfileKarmaLogTransformer } from "../transformers/CommunityUserProfileKarmaLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityUserProfilesUserProfileIdKarmaLogs(props: {
  userProfileId: string & tags.Format<"uuid">;
  body: ICommunityUserProfileKarmaLog.IRequest;
}): Promise<IPageICommunityUserProfileKarmaLog> {
  // Step 1: Validate that the userProfileId corresponds to an existing profile (auto-404 if not found)
  await MyGlobal.prisma.community_user_profiles.findUniqueOrThrow({
    where: { id: props.userProfileId },
    select: { id: true },
  });
  // Step 2: Build WHERE input
  const whereInput = {
    community_user_profile_id: props.userProfileId,
    ...(props.body.source_types !== undefined &&
      props.body.source_types.length > 0 && {
        source_type: { in: props.body.source_types },
      }),
    ...(props.body.from != null && {
      created_at: {
        gte: new Date(props.body.from),
        ...(props.body.to != null && { lte: new Date(props.body.to) }),
      },
    }),
    ...(props.body.from == null &&
      props.body.to != null && {
        created_at: { lte: new Date(props.body.to) },
      }),
  } satisfies Prisma.community_user_profile_karma_logsWhereInput;
  // Step 3: Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Ordering — derive sort direction without `as` assertion
  const sortDir: "asc" | "desc" = props.body.sort === "asc" ? "asc" : "desc";
  const orderByInput = {
    created_at: sortDir,
  } satisfies Prisma.community_user_profile_karma_logsOrderByWithRelationInput;
  // Step 5: Fetch paginated records
  const data = await MyGlobal.prisma.community_user_profile_karma_logs.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityUserProfileKarmaLogTransformer.select(),
    },
  );
  // Step 6: Count total matching records
  const total = await MyGlobal.prisma.community_user_profile_karma_logs.count({
    where: whereInput,
  });
  // Step 7: Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityUserProfileKarmaLogTransformer.transform,
    ),
  };
}
