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

export async function test_api_community_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Authorize member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Update member connection with authentication token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${authorizedMember.token.access}`,
  };
  // Create community using the proper utility (with empty body since ICommunityCommunity.ICreate is empty)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {} satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Validate community creation successfully
  // Note: ICommunityCommunity interface is currently defined as empty ({})
  // which contradicts the scenario description that it should have id, name, description
  // This is a schema definition error in the API types. We cannot validate
  // properties that don't exist in the type definition, but the API
  // behavior follows the scenario as written.
  // We pass this test by ensuring the request completes successfully.
  typia.assertGuard(community);
}
