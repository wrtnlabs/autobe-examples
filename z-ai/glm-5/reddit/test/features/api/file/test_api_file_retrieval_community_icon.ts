import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_file_retrieval_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account (will become community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community with an icon file ID
  const iconFileId = typia.random<string & tags.Format<"uuid">>();
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconFileId,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Use the icon file from the community response if available
  // In test/simulation mode, community.icon should be populated with file metadata
  const fileId = community.icon?.id ?? iconFileId;
  // Step 4: Retrieve the file metadata (public endpoint, no auth required)
  const file = await api.functional.communityPlatform.files.at(connection, {
    fileId,
  });
  typia.assert(file);
  // Step 5: Validate file metadata ownership tracking
  TestValidator.equals("owner type", file.ownerType, "community_icon");
  TestValidator.equals(
    "owner ID matches community",
    file.ownerId,
    community.id,
  );
  TestValidator.predicate(
    "valid MIME type",
    file.mimeType.startsWith("image/"),
  );
  TestValidator.predicate("has path", file.path.length > 0);
  TestValidator.predicate("positive size", file.size > 0);
  TestValidator.predicate(
    "valid created timestamp",
    file.createdAt !== undefined,
  );
}
