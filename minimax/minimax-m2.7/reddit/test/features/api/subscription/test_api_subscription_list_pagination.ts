import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostTextContent";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test pagination with different parameters
  // Get first page with default or small limit
  const firstPage = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditClonePostTextContent.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    firstPage.pagination !== null,
    true,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 2", firstPage.pagination.limit, 2);
  TestValidator.predicate("records >= 0", firstPage.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", firstPage.pagination.pages >= 0);
  // Calculate expected pages based on records and limit
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    firstPage.pagination.pages,
    expectedPages,
  );
  // 3. Test pagination with different page parameter
  const secondPage =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  // 4. Test with different limit values
  const smallLimit =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals("small limit value", smallLimit.pagination.limit, 1);
  // 5. Test records consistency across pagination parameters
  // Total records should remain consistent regardless of pagination
  TestValidator.equals(
    "records consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // 6. Test edge case: requesting page beyond available data
  const highPage = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 999,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditClonePostTextContent.IRequest,
    },
  );
  typia.assert(highPage);
  // High page should return empty data but pagination metadata should be valid
  TestValidator.equals("high page current", highPage.pagination.current, 999);
  TestValidator.equals("high page data empty", highPage.data.length, 0);
  TestValidator.equals(
    "records unchanged",
    highPage.pagination.records,
    firstPage.pagination.records,
  );
  // 7. Test with larger limit
  const largeLimit =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals("large limit value", largeLimit.pagination.limit, 50);
  TestValidator.predicate("data count <= limit", largeLimit.data.length <= 50);
  // 8. Validate data structure in response
  for (const subscription of firstPage.data) {
    typia.assert(subscription);
    TestValidator.predicate(
      "subscription has id",
      subscription.id !== undefined,
    );
    TestValidator.predicate(
      "subscription has member",
      subscription.member !== undefined,
    );
    TestValidator.predicate(
      "subscription has community",
      subscription.community !== undefined,
    );
  }
}
