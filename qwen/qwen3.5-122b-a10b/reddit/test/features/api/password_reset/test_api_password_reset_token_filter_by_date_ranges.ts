import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_filter_by_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test filtering by created_at date range
  const now = new Date();
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const created_at_filter =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: pastMonth.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(created_at_filter);
  // 3. Test filtering by expires_at date range
  const expires_at_filter =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          expires_at_from: pastWeek.toISOString(),
          expires_at_to: now.toISOString(),
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expires_at_filter);
  // 4. Test combining multiple date range filters with email search
  const combined_filter =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: member.email,
          created_at_from: pastMonth.toISOString(),
          created_at_to: now.toISOString(),
          expires_at_from: pastWeek.toISOString(),
          expires_at_to: now.toISOString(),
          status: "active",
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(combined_filter);
  // 5. Test pagination
  const paginated =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(paginated);
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginated.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginated.pagination.pages >= 0,
  );
}