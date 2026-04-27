import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that listing password reset requests returns an empty page when no member has ever requested a password reset.
 *
 * Validates the empty-state handling of the password reset listing endpoint. A newly registered member lists all password reset requests on the platform. Since no password reset has ever been requested, the endpoint must return a well-structured empty page with correct pagination metadata rather than an error or null response.
 *
 * 1. Register a new member account (automatically authenticates and sets up the connection).
 * 2. Call the password reset listing endpoint with default pagination (page=1, limit=20).
 * 3. Validate the response with typia.assert for complete type safety.
 * 4. Verify pagination metadata: current=1, limit=20, records=0, pages=0.
 * 5. Verify the data array is empty.
 */
export async function test_api_password_reset_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. List password reset requests (none should exist)
  const page =
    await api.functional.communityPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate empty page
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("limit", page.pagination.limit, 20);
  TestValidator.equals("records count", page.pagination.records, 0);
  TestValidator.equals("pages count", page.pagination.pages, 0);
  TestValidator.equals("data array", page.data, []);
}
