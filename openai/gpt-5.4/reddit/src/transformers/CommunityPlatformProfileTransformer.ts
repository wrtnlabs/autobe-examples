import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformProfileFileTransformer } from "./CommunityPlatformProfileFileTransformer";

export namespace CommunityPlatformProfileTransformer {
  export type Payload = Prisma.community_platform_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        files: CommunityPlatformProfileFileTransformer.select(),
      },
    } satisfies Prisma.community_platform_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? null,
      member: (await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      )) as ICommunityPlatformProfile.ISummary,
      files: await ArrayUtil.asyncMap(
        input.files,
        CommunityPlatformProfileFileTransformer.transform,
      ),
      karma: 0,
      posts: [],
      comments: {} satisfies ICommunityPlatformComment,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
