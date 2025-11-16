import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

export async function test_api_guest_user_limit_enforcement_max(
  connection: api.IConnection,
) {
  // The system enforces a maximum page size limit of 100 guests per request.
  // Since the TypeScript type system enforces limit to be between 1 and 100,
  // we can only test the boundary case: use the maximum allowable limit (100)
  // to confirm the system accepts and processes the maximum value successfully.
  // The server automatically clamps values above 100 to 100, but we cannot verify
  // this clamp because the response schema is IPageICommunityPlatformGuest.ISummary = null.
  // Therefore, we verify that a request with the maximum limit (100) succeeds.

  // Generate a valid request with the maximum allowed limit
  const requestBody: ICommunityPlatformGuest.IRequest = {
    limit: 100,
  } satisfies ICommunityPlatformGuest.IRequest;

  // Call the endpoint with the maximum limit
  const result: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: requestBody,
    });

  // The response type is explicitly null per schema, so no properties to validate.
  // We only verify the request succeeded without error (the endpoint accepted the request).
  typia.assert(result);
}
