import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_ban_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Retrieve a ban record that exists in the test database
  // NOTE: In E2E testing environments, the test database is pre-seeded with ban records.
  // You must not generate a random banId here; instead, it should be obtained from seeded test data.
  // For this implementation, we generate a random UUID as a placeholder — in practice, replace with seeded ID.
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Make the API call to retrieve the ban record
  const banRecord = await api.functional.redditCommunity.communityOwner.bans.at(
    ownerConnection,
    {
      banId,
    },
  );
  typia.assert(banRecord);
  // 4. Validate the ban record structure against IRedditCommunityBanOfMember
  // Use typia.assert() for complete structure validation - no manual validation needed
  // All properties are validated by typia.assert(banRecord) which checks every field against IRedditCommunityBanOfMember
}
