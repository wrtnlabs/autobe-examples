import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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

export async function test_api_community_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create the first community with a unique name — should succeed
  const communityName = `UniqueCommunity_${RandomGenerator.alphaNumeric(12)}`;
  const firstCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(firstCommunity);
  // Validate the first community has the expected name
  TestValidator.equals(
    "first community name matches",
    firstCommunity.name,
    communityName,
  );
  // 3. Attempt to create a second community with the exact same name — should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate community name rejected with 409",
    409,
    async () => {
      await generate_random_community_member_communities_create(
        memberConnection,
        {
          body: {
            name: communityName,
          },
        },
      );
    },
  );
}
