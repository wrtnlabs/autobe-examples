import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Create a unique community name using random generation
  const communityName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 15,
  });
  const communityDescription: string | undefined = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  // Step 3: Create a community with the unique name and optional description using memberConnection
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Validate community properties
  TestValidator.equals(
    "community status should be pending_approval",
    community.status,
    "pending_approval",
  );
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "creator id matches authenticated member",
    community.creator.id,
    memberAuth.id,
  );
  // Step 5: Test community name uniqueness constraint - attempt to create duplicate community
  await TestValidator.error(
    "duplicate community name should fail",
    async () => {
      const duplicateCommunityName = communityName; // Use same name as previous
      await generate_random_community_bbs_member_communities_create(
        memberConnection,
        {
          body: {
            name: duplicateCommunityName,
            description: "Duplicate description",
          } satisfies ICommunityBbsCommunity.ICreate,
        },
      );
    },
  );
}
