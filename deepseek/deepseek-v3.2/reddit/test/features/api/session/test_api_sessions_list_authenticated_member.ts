import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_sessions_list_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Call sessions endpoint with default pagination parameters
  const sessionsPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(sessionsPage);
  // Validate pagination metadata (business logic testing)
  const { pagination, data } = sessionsPage;
  TestValidator.equals("current page matches request", pagination.current, 1);
  TestValidator.equals("limit matches request", pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // Validate pagination calculation (business logic)
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages count calculated correctly",
      pagination.pages,
      expectedPages,
    );
  }
  // Validate data length respects pagination (business logic)
  if (pagination.records > 0) {
    const maxExpected = Math.min(pagination.limit, pagination.records);
    TestValidator.predicate(
      "data length respects pagination limit",
      data.length <= maxExpected,
    );
  } else {
    TestValidator.equals("no records means no data", data.length, 0);
  }
  // Validate session structure - typia.assert already did complete validation
  // No manual property checks needed after typia.assert
  // Business validation: each session has guest relation
  for (const session of data) {
    // typia.assert(session) already validates all properties including guest
    // Business logic: guest should have valid anonymous_id
    TestValidator.predicate(
      "guest has anonymous_id",
      session.guest.anonymous_id.length > 0,
    );
  }
}
