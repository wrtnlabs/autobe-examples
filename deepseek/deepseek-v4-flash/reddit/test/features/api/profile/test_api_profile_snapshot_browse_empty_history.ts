import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test browsing profile snapshot history when the member has never created any snapshots.
 *
 * Validates that the system correctly handles the case where a newly registered member (who has taken no profile-updating or snapshot-creating actions) queries their snapshot history. The response should return an empty page with correct pagination metadata indicating zero total records.
 *
 * 1. Join as a new member via POST /communityPlatform/auth/member/join (creates initial profile with karma=0).
 * 2. Browse snapshot history via PATCH /communityPlatform/member/profile/snapshots with default pagination (page=1, limit=20), filtering by the member's ID.
 * 3. Verify the response returns an empty page — data array is empty, total records is 0, pages is 0.
 * 4. Verify pagination metadata shows current=1, limit=20, records=0, pages=0.
 */
export async function test_api_profile_snapshot_browse_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Browse snapshot history with memberId filter and default pagination
  const page: IPageICommunityPlatformProfileSnapshot.ISummary =
    await api.functional.communityPlatform.member.profile.snapshots.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformProfileSnapshot.IRequest,
      },
    );
  typia.assert(page);
  // 3. Verify empty data and zero counts
  TestValidator.equals("data is empty", page.data, []);
  TestValidator.equals("records is 0", page.pagination.records, 0);
  TestValidator.equals("pages is 0", page.pagination.pages, 0);
  // 4. Verify pagination defaults
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.equals("limit is 20", page.pagination.limit, 20);
}
