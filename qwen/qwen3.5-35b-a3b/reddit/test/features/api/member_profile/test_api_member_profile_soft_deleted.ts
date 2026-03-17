import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test privacy protection for soft-deleted member accounts.
 * Validates that the profile endpoint returns 404 for soft-deleted accounts,
 * ensuring account deletion privacy.
 */
export async function test_api_member_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Create new connection with auth token from join response
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // Generate realistic username for the member
  const memberUsername = RandomGenerator.name(2);
  // 2. Retrieve member profile to confirm accessibility while active
  const profileConnection: api.IConnection = { host: connection.host };
  const initialProfile = await api.functional.redditCommunity.members.at(
    profileConnection,
    {
      memberId: memberUsername,
    },
  );
  typia.assert(initialProfile);
  TestValidator.equals(
    "profile accessible before deletion",
    initialProfile.username,
    memberUsername,
  );
  // 3. Trigger soft-delete via profile update endpoint
  const deleteConnection: api.IConnection = { host: connection.host };
  deleteConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  const deleteProfile =
    await api.functional.redditCommunity.member.profile.update(
      deleteConnection,
      {
        body: { display_name: RandomGenerator.name() },
      },
    );
  typia.assert(deleteProfile);
  // 4. Attempt to retrieve member profile again after deletion
  const retrievalConnection: api.IConnection = { host: connection.host };
  // 5. Validate that endpoint returns 404 for soft-deleted accounts
  await TestValidator.error("soft-deleted profile returns 404", async () => {
    await api.functional.redditCommunity.members.at(retrievalConnection, {
      memberId: memberUsername,
    });
  });
}