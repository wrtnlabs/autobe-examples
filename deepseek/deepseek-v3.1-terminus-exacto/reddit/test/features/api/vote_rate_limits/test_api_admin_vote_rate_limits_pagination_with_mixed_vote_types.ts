import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_vote_rate_limits_pagination_with_mixed_vote_types(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test pagination with different limits
  const testLimits = [1, 10, 25, 100];
  for (const limit of testLimits) {
    // Test first page
    const page1Response =
      await api.functional.communityPlatform.admin.vote_rate_limits.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies ICommunityPlatformVoteRateLimit.IRequest,
        },
      );
    typia.assert(page1Response);
    // Validate pagination metadata structure
    TestValidator.equals(
      "pagination current page",
      page1Response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit",
      page1Response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "records count non-negative",
      page1Response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count non-negative",
      page1Response.pagination.pages >= 0,
    );
    // Calculate expected pages based on records and limit
    const expectedPages =
      page1Response.pagination.records === 0
        ? 0
        : Math.ceil(page1Response.pagination.records / limit);
    TestValidator.equals(
      "pages calculation",
      page1Response.pagination.pages,
      expectedPages,
    );
    // Test data array length matches pagination
    TestValidator.predicate(
      "data length valid",
      page1Response.data.length <= limit &&
        (page1Response.pagination.current === page1Response.pagination.pages
          ? page1Response.data.length <=
              page1Response.pagination.records % limit ||
            page1Response.pagination.records % limit === 0
          : page1Response.data.length === limit),
    );
    // Test second page if available
    if (page1Response.pagination.pages > 1) {
      const page2Response =
        await api.functional.communityPlatform.admin.vote_rate_limits.index(
          adminConnection,
          {
            body: {
              page: 2,
              limit: limit satisfies number as number,
            } satisfies ICommunityPlatformVoteRateLimit.IRequest,
          },
        );
      typia.assert(page2Response);
      TestValidator.equals(
        "page 2 current page",
        page2Response.pagination.current,
        2,
      );
      TestValidator.equals(
        "page 2 limit",
        page2Response.pagination.limit,
        limit,
      );
      TestValidator.equals(
        "page 2 total records",
        page2Response.pagination.records,
        page1Response.pagination.records,
      );
      TestValidator.equals(
        "page 2 total pages",
        page2Response.pagination.pages,
        page1Response.pagination.pages,
      );
    }
    // Test last page if available
    if (page1Response.pagination.pages > 0) {
      const lastPageResponse =
        await api.functional.communityPlatform.admin.vote_rate_limits.index(
          adminConnection,
          {
            body: {
              page: page1Response.pagination.pages,
              limit: limit satisfies number as number,
            } satisfies ICommunityPlatformVoteRateLimit.IRequest,
          },
        );
      typia.assert(lastPageResponse);
      TestValidator.equals(
        "last page current",
        lastPageResponse.pagination.current,
        page1Response.pagination.pages,
      );
    }
    // Test page beyond total pages (should return empty or last page)
    if (page1Response.pagination.pages > 0) {
      const beyondPageResponse =
        await api.functional.communityPlatform.admin.vote_rate_limits.index(
          adminConnection,
          {
            body: {
              page: page1Response.pagination.pages + 1,
              limit: limit satisfies number as number,
            } satisfies ICommunityPlatformVoteRateLimit.IRequest,
          },
        );
      typia.assert(beyondPageResponse);
      // Should either return empty data or handle gracefully
      TestValidator.predicate(
        "beyond page handles gracefully",
        beyondPageResponse.data.length === 0 ||
          beyondPageResponse.pagination.current <=
            page1Response.pagination.pages,
      );
    }
  }
  // Test filtering with mixed entity types
  const entityTypes = ["post", "comment"] as const;
  const voteTypes = ["upvote", "downvote"] as const;
  // Test entity type filtering
  for (const entityType of entityTypes) {
    const filteredResponse =
      await api.functional.communityPlatform.admin.vote_rate_limits.index(
        adminConnection,
        {
          body: {
            entity_type: entityType,
            page: 1,
            limit: 10 satisfies number as number,
          } satisfies ICommunityPlatformVoteRateLimit.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // All returned records should match the filter
    for (const record of filteredResponse.data) {
      TestValidator.equals(
        `entity type filter ${entityType}`,
        record.entity_type,
        entityType,
      );
    }
  }
  // Test vote type filtering
  for (const voteType of voteTypes) {
    const filteredResponse =
      await api.functional.communityPlatform.admin.vote_rate_limits.index(
        adminConnection,
        {
          body: {
            vote_type: voteType,
            page: 1,
            limit: 10 satisfies number as number,
          } satisfies ICommunityPlatformVoteRateLimit.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // All returned records should match the filter
    for (const record of filteredResponse.data) {
      TestValidator.equals(
        `vote type filter ${voteType}`,
        record.vote_type,
        voteType,
      );
    }
  }
  // Test combined filtering
  const combinedResponse =
    await api.functional.communityPlatform.admin.vote_rate_limits.index(
      adminConnection,
      {
        body: {
          entity_type: RandomGenerator.pick(entityTypes),
          vote_type: RandomGenerator.pick(voteTypes),
          page: 1,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformVoteRateLimit.IRequest,
      },
    );
  typia.assert(combinedResponse);
}
