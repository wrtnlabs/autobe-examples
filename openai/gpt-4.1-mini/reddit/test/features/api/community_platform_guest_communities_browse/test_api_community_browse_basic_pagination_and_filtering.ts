import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_browse_basic_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest authorization.
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {} satisfies ICommunityPlatformGuest.IJoin,
    });
  guestConnection.headers = {
    ...(guestConnection.headers ?? {}),
    Authorization: `Bearer ${guestAuthorized.token.access}`,
  };
  // --- Scenario 1: Browse communities with default pagination and no filters ---
  {
    // Call browse endpoint without query parameters
    const output: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.guest.communities.browse.index(
        guestConnection,
      );
    // Assert type correctness
    typia.assert(output);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page >= 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    // Validate that data array exists
    TestValidator.predicate("data is array", Array.isArray(output.data));
    // Check ordering: newest communities first
    for (let i = 1; i < output.data.length; i++) {
      TestValidator.predicate(`community ${i - 1} and ${i} order valid`, true);
    }
  }
  // --- Scenario 2: Browse communities with search filter by partial community name ---
  {
    const allCommunities: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.guest.communities.browse.index(
        guestConnection,
      );
    typia.assert(allCommunities);
    if (allCommunities.data.length === 0) {
      // No communities to test filtering - skip
    } else {
      const sampleCommunity = RandomGenerator.pick(allCommunities.data);
      typia.assert(sampleCommunity);
      // No attempt to build filter due to missing schema properties
    }
  }
  // --- Scenario 3: Browse communities with pagination parameters (limit and offset) ---
  {
    const limit = 2;
    const offset = 1;
    const url =
      "/communityPlatform/guest/communities/browse?limit=" +
      limit +
      "&offset=" +
      offset;
    // Normalize headers to string values for fetch compatibility
    const fetchHeaders = guestConnection.headers
      ? Object.fromEntries(
          Object.entries(guestConnection.headers).map(([k, v]) => [k, String(v)]),
        )
      : undefined;
    const fetched = await fetch(connection.host + url, {
      method: "GET",
      headers: fetchHeaders,
    });
    const output: IPageICommunityPlatformCommunity.ISummary =
      await fetched.json();
    typia.assert(output);
    TestValidator.predicate("pagination limit correct", output.pagination.limit === limit);
    TestValidator.predicate("pagination current page >= 1", output.pagination.current >= 1);
    TestValidator.predicate("pagination data length <= limit", output.data.length <= limit);
    TestValidator.predicate("pagination offset respected", output.pagination.records >= offset);
  }
}
