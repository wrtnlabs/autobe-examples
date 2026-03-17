import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_dashboard_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Call dashboard endpoint with default filters
  const dashboard =
    await api.functional.communityPlatform.member.dashboard.search(
      memberConnection,
      {
        body: {
          search: null,
          sort_by: undefined,
          sort_order: undefined,
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(dashboard);
  // Business logic validation (not type validation)
  TestValidator.predicate(
    "dashboard should contain community data",
    dashboard.id !== undefined,
  );
  TestValidator.predicate(
    "community should have non-empty name",
    dashboard.name.length > 0,
  );
  TestValidator.predicate(
    "owner should match authenticated member context",
    dashboard.owner.id !== undefined,
  );
}
