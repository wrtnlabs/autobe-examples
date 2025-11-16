import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

export async function test_api_guest_user_sort_by_session_count_desc(
  connection: api.IConnection,
) {
  const response: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        sortBy: "sessionCount",
        sortOrder: "desc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(response);
  TestValidator.equals(
    "response should be null as per DTO definition",
    response,
    null,
  );
}
