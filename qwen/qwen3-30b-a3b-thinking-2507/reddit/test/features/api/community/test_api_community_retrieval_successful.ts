import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: ICommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      } satisfies ICommunityMember.IJoin,
    });
  // 2. Create sample community
  const community: ICommunityCommunity =
    await api.functional.community.member.communities.create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: "https://example.com/icon.png",
      } satisfies ICommunityCommunity.ICreate,
    });
  typia.assert(community);
  // 3. Retrieve the community we just created - using unauthenticated (guest) connection
  const retrievedCommunity: ICommunityCommunity =
    await api.functional.community.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);
  // 4. Validate
  TestValidator.equals(
    "name should match",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "description should match",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "icon URL should match",
    retrievedCommunity.icon_url,
    community.icon_url,
  );
  TestValidator.equals(
    "owner ID should match",
    retrievedCommunity.owner.id,
    community.owner.id,
  );
  TestValidator.equals(
    "owner display_name should match",
    retrievedCommunity.owner.display_name,
    community.owner.display_name,
  );
  TestValidator.equals(
    "created at should match",
    retrievedCommunity.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "updated at should match",
    retrievedCommunity.updated_at,
    community.updated_at,
  );
  TestValidator.equals(
    "community should not be deleted",
    retrievedCommunity.deleted_at,
    null,
  );
}
