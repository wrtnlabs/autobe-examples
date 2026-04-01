import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community creation with an icon image URI provided.
 * An authenticated member creates a community including an iconImageUri in the request body.
 * Verify that:
 * (1) The community is created successfully with the icon image associated
 * (2) The response includes the community icon metadata in the communityIcons array
 * (3) The icon record is properly linked to the community via the community reference
 * (4) The icon has valid storage key and metadata
 * (5) The community owner matches the member who created it
 */
export async function test_api_community_creation_with_icon_uri(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community with icon image URI
  const iconImageUri = typia.random<string & tags.Format<"uri">>();
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          iconImageUri: iconImageUri,
        },
      },
    );
  typia.assert(community);
  // 3. Validate community has icon in communityIcons array
  TestValidator.predicate(
    "community has icons",
    community.communityIcons.length > 0,
  );
  const icon = community.communityIcons[0];
  typia.assert(icon);
  // 4. Validate icon metadata (using storageKey, not storageUrl - that's in ISummary)
  TestValidator.predicate(
    "icon has valid UUID",
    /^[0-9a-f-]{36}$/i.test(icon.id),
  );
  TestValidator.predicate("icon has storage key", icon.storageKey.length > 0);
  TestValidator.predicate(
    "icon has original filename",
    icon.originalFilename.length > 0,
  );
  TestValidator.predicate(
    "icon has valid MIME type",
    /^image\/.+/.test(icon.mimeType),
  );
  TestValidator.predicate("icon file size is positive", icon.fileSize > 0);
  // 5. Validate icon is linked to the community
  TestValidator.equals(
    "icon community ID matches",
    icon.community.id,
    community.id,
  );
  TestValidator.equals(
    "icon community name matches",
    icon.community.name,
    community.name,
  );
  // 6. Validate community owner is the member who created it
  TestValidator.equals(
    "community owner ID matches member",
    community.owner.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "community owner has username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "community owner has created_at",
    community.owner.created_at.length > 0,
  );
  // 7. Validate community basic properties
  TestValidator.predicate(
    "community has valid ID",
    /^[0-9a-f-]{36}$/i.test(community.id),
  );
  TestValidator.predicate("community has name", community.name.length > 0);
  TestValidator.predicate(
    "community has description",
    community.description.length > 0,
  );
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "community has created_at",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "community has updated_at",
    community.updated_at.length > 0,
  );
  TestValidator.equals(
    "community deleted_at is null",
    community.deleted_at,
    null,
  );
}
