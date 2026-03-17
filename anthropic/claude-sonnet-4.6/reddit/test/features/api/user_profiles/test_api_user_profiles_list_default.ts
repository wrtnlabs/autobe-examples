import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profiles_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two member accounts to ensure at least 2 profiles exist
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 2. Use a plain unauthenticated connection for the public listing endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  // 3. Call PATCH /community/userProfiles with default parameters (empty body)
  const result = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {} satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate pagination defaults
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate("records >= 2", result.pagination.records >= 2);
  TestValidator.predicate("pages >= 1", result.pagination.pages >= 1);
  // 5. Validate data array has at least 2 entries
  TestValidator.predicate(
    "data has at least 2 profiles",
    result.data.length >= 2,
  );
  // 6. Confirm both newly registered members appear in the list
  const usernames = result.data.map((p) => p.username);
  TestValidator.predicate(
    "member1 username appears in list",
    usernames.includes(member1.username),
  );
  TestValidator.predicate(
    "member2 username appears in list",
    usernames.includes(member2.username),
  );
  // 7. Validate default sort: karma_score descending
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `profile[${i}].karma_score >= profile[${i + 1}].karma_score`,
      result.data[i]!.karma_score >= result.data[i + 1]!.karma_score,
    );
  }
  // 8. Newly registered members should have karma_score = 0
  const member1Profile = result.data.find(
    (p) => p.username === member1.username,
  );
  const member2Profile = result.data.find(
    (p) => p.username === member2.username,
  );
  typia.assertGuard(member1Profile!);
  TestValidator.equals(
    "member1 karma_score is 0",
    member1Profile.karma_score,
    0,
  );
  TestValidator.equals(
    "member1 display_name is null",
    member1Profile.display_name,
    null,
  );
  TestValidator.equals("member1 bio is null", member1Profile.bio, null);
  TestValidator.equals(
    "member1 avatar_url is null",
    member1Profile.avatar_url,
    null,
  );
  typia.assertGuard(member2Profile!);
  TestValidator.equals(
    "member2 karma_score is 0",
    member2Profile.karma_score,
    0,
  );
  TestValidator.equals(
    "member2 display_name is null",
    member2Profile.display_name,
    null,
  );
  TestValidator.equals("member2 bio is null", member2Profile.bio, null);
  TestValidator.equals(
    "member2 avatar_url is null",
    member2Profile.avatar_url,
    null,
  );
}
