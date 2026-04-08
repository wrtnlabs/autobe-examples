import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_retrieve_active_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Create a new connection with the member's auth token for subsequent requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // Step 2: Generate a valid community UUID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve the community using the authenticated connection
  const community = await api.functional.redditCommunity.member.communities.at(
    authenticatedConnection,
    {
      communityId,
    },
  );
  typia.assert(community);
  // Step 4: Validate the response structure and fields
  TestValidator.equals("community id matches", community.id, communityId);
  TestValidator.notEquals("community name is not empty", community.name, "");
  TestValidator.predicate(
    "community is active (not soft-deleted)",
    community.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    !Number.isNaN(Date.parse(community.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    !Number.isNaN(Date.parse(community.updated_at)),
  );
}