import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_communities_browse_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using the utility function
  const authConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create member connection with token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: memberAuth.token.access,
  };
  // Step 3: Browse all communities with empty request body (no filters)
  const communities =
    await api.functional.redditCommunity.member.communities.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(communities);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination current page defaults to 1",
    communities.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit defaults to 10",
    communities.pagination.limit,
    10,
  );
  // When no communities exist, records and pages should be 0
  if (communities.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages is 0 when no records",
      communities.pagination.pages,
      0,
    );
    TestValidator.equals(
      "data array is empty when no records",
      communities.data.length,
      0,
    );
  } else {
    // When communities exist, validate pagination accuracy
    TestValidator.equals(
      "pagination records matches data length",
      communities.pagination.records,
      communities.data.length,
    );
    TestValidator.equals(
      "pagination pages calculated correctly",
      communities.pagination.pages,
      Math.ceil(communities.pagination.records / communities.pagination.limit),
    );
    // Step 5: Validate community data structure and business rules
    for (const community of communities.data) {
      // typia.assert(community) is implicit from typia.assert(communities)
      // Validate required fields exist and have valid values
      TestValidator.predicate(
        "community id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.id,
        ),
      );
      TestValidator.predicate("community has name", community.name.length > 0);
      TestValidator.predicate(
        "community has created_at timestamp",
        new Date(community.created_at).getTime() > 0,
      );
      // Validate description can be null or undefined
      TestValidator.predicate(
        "description is nullable",
        community.description === null ||
          community.description === undefined ||
          typeof community.description === "string",
      );
      // Validate subscriber_count if present
      if (community.subscriber_count !== undefined) {
        TestValidator.predicate(
          "subscriber_count is non-negative integer",
          Number.isInteger(community.subscriber_count) &&
            community.subscriber_count >= 0,
        );
      }
      // Validate deleted_at is null for active communities (soft-delete field)
      if (community.deleted_at !== undefined) {
        TestValidator.equals(
          "community is active (deleted_at is null)",
          community.deleted_at,
          null,
        );
      }
    }
    // Step 6: Validate default sorting by subscriber_count DESC
    if (communities.data.length > 1) {
      for (let i = 0; i < communities.data.length - 1; i++) {
        const currentSubscriberCount =
          communities.data[i].subscriber_count ?? 0;
        const nextSubscriberCount =
          communities.data[i + 1].subscriber_count ?? 0;
        TestValidator.predicate(
          "communities sorted by subscriber_count DESC",
          currentSubscriberCount >= nextSubscriberCount,
        );
      }
    }
  }
}
