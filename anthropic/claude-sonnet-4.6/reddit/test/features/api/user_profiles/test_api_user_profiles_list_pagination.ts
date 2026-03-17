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

export async function test_api_user_profiles_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Register 3 member accounts to populate profiles ───────────────────
  const memberConnection1: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection1, {});
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {});
  const memberConnection3: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection3, {});
  // ─── 2. Public connection (no auth) ───────────────────────────────────────
  const publicConnection: api.IConnection = { host: connection.host };
  // ─── 3. Page 1 with limit 2 ───────────────────────────────────────────────
  const page1 = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata for page 1
  TestValidator.equals("page1 pagination.current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination.limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "page1 pagination.records >= 3",
    page1.pagination.records >= 3,
  );
  TestValidator.equals(
    "page1 pagination.pages equals ceil(records/2)",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / 2),
  );
  TestValidator.equals("page1 data length is 2", page1.data.length, 2);
  // ─── 4. Page 2 with limit 2 ───────────────────────────────────────────────
  const page2 = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(page2);
  // Validate pagination metadata for page 2
  TestValidator.equals("page2 pagination.current", page2.pagination.current, 2);
  // ─── 5. No overlap between page 1 and page 2 ──────────────────────────────
  const page1Ids = new Set(page1.data.map((p) => p.id));
  const page2Ids = page2.data.map((p) => p.id);
  const hasOverlap = page2Ids.some((id) => page1Ids.has(id));
  TestValidator.predicate("no overlap between page 1 and page 2", !hasOverlap);
  // ─── 6. Large limit: page 1, limit 100 ───────────────────────────────────
  const pageLargeLimit = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(pageLargeLimit);
  TestValidator.equals(
    "large limit pagination.limit",
    pageLargeLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit data includes all profiles",
    pageLargeLimit.data.length === pageLargeLimit.pagination.records,
  );
  // ─── 7. Out-of-range page: page 9999, limit 20 ───────────────────────────
  const pageOutOfRange = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        page: 9999,
        limit: 20,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(pageOutOfRange);
  TestValidator.equals(
    "out-of-range page returns empty data",
    pageOutOfRange.data.length,
    0,
  );
  TestValidator.predicate(
    "out-of-range page records reflects actual total",
    pageOutOfRange.pagination.records >= 3,
  );
}
