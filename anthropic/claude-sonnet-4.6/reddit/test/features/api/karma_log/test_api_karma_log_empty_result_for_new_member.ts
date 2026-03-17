import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfileKarmaLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_karma_log_empty_result_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (this auto-creates a user profile with no karma history)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Retrieve the new member's public profile to confirm identity
  const publicConnection: api.IConnection = { host: connection.host };
  const memberProfile = await api.functional.community.members.at(
    publicConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(memberProfile);
  // Step 3: Query karma logs for the new member's user profile
  // The karma log endpoint uses userProfileId (community_user_profiles.id)
  // Since the member profile is created atomically at registration,
  // we use the member's id to look up karma logs via a public (no-auth) connection
  const noAuthConnection: api.IConnection = { host: connection.host };
  const karmaLogs = await api.functional.community.userProfiles.karmaLogs.index(
    noAuthConnection,
    {
      userProfileId: memberProfile.id,
      body: {} satisfies ICommunityUserProfileKarmaLog.IRequest,
    },
  );
  typia.assert(karmaLogs);
  // Validate: empty result set for new member
  TestValidator.equals("data is empty array", karmaLogs.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    karmaLogs.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", karmaLogs.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1 (default)",
    karmaLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    karmaLogs.pagination.limit,
    20,
  );
}
