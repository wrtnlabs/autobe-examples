import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityProfile";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test default sorting and pagination mechanisms for profile listing.
 *
 * Validates that the profile listing endpoint correctly applies default sorting by `created_at` in descending order when no explicit sort parameters are provided. Also verifies that offset-based pagination correctly limits and pages through the result set.
 *
 * Multiple members are created sequentially to establish a dataset with known relative ordering, then the API response is validated to ensure newest profiles appear first.
 *
 * 1. Create five members sequentially using random credentials.
 * 2. Retrieve all profiles without explicit sort parameters.
 * 3. Assert that returned profiles are sorted by `created_at` descending.
 * 4. Request page 1 with limit 2, verify correct subset is returned.
 * 5. Request page 2 with limit 2, verify next subset is returned.
 */
export async function test_api_profiles_sort_created_at_desc(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create multiple members to populate the dataset
  const members: IREdditLikeCommunityMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConn: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.alphabets(8),
      },
    });
    typia.assert(member);
    members.push(member);
  }
  // Step 2: Retrieve profiles without explicit sort parameters
  const noSortConn: api.IConnection = { host: connection.host };
  const allProfiles = await api.functional.redditLikeCommunity.profiles.index(
    noSortConn,
    {
      body: {} satisfies IREdditLikeCommunityProfile.IRequest,
    },
  );
  typia.assert(allProfiles);
  TestValidator.equals(
    "record count matches created members",
    allProfiles.pagination.records,
    5,
  );
  // Step 3: Assert profiles are sorted by created_at descending
  const profileData = allProfiles.data;
  for (let i = 0; i < profileData.length - 1; i++) {
    TestValidator.predicate(
      `profile[${i}] created_at >= profile[${i + 1}] created_at`,
      new Date(profileData[i].created_at).getTime() >=
        new Date(profileData[i + 1].created_at).getTime(),
    );
  }
  // Step 4: Test offset-based pagination - page 1 with limit 2
  const page1Conn: api.IConnection = { host: connection.host };
  const page1 = await api.functional.redditLikeCommunity.profiles.index(
    page1Conn,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IREdditLikeCommunityProfile.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 has 2 records", page1.data.length <= 2);
  // Step 5: Test offset-based pagination - page 2 with limit 2
  const page2Conn: api.IConnection = { host: connection.host };
  const page2 = await api.functional.redditLikeCommunity.profiles.index(
    page2Conn,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IREdditLikeCommunityProfile.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.predicate("page 2 has records", page2.data.length > 0);
  // Verify page 1 and page 2 have no overlapping profiles
  const page1Ids = new Set(page1.data.map((p) => p.id));
  const page2Ids = new Set(page2.data.map((p) => p.id));
  const overlaps = Array.from(page1Ids).filter((id) => page2Ids.has(id));
  TestValidator.equals("no overlap between page 1 and 2", overlaps.length, 0);
}
