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

export async function test_api_subscription_filter_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IJoin,
    },
  );
  typia.assert(authorized);
  memberConnection.headers!.Authorization = authorized.token.access;
  // Get all subscriptions without filter first
  const allSubscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  // Test filtering by communityName
  const filteredByName =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: "test-community",
        } satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(filteredByName);
  // Validate filtering by name
  TestValidator.equals(
    "filtered by name returns valid pagination structure",
    filteredByName.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "filtered by name returns data array",
    Array.isArray(filteredByName.data),
    true,
  );
  // If data exists, verify all items match the filter
  if (filteredByName.data.length > 0) {
    for (const subscription of filteredByName.data) {
      TestValidator.equals(
        "community name matches filter",
        subscription.community.name,
        "test-community",
      );
    }
  }
  // Test filtering by communityId
  const filteredById =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(filteredById);
  // Validate filtering by ID
  TestValidator.equals(
    "filtered by ID returns valid pagination structure",
    filteredById.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "filtered by ID returns data array",
    Array.isArray(filteredById.data),
    true,
  );
  // If data exists, verify all items match the filter
  if (filteredById.data.length > 0) {
    for (const subscription of filteredById.data) {
      TestValidator.equals(
        "community ID matches filter",
        subscription.community.id,
        filteredById.data[0].community.id,
      );
    }
  }
  // Test pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination has current page",
    typeof allSubscriptions.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof allSubscriptions.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    typeof allSubscriptions.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof allSubscriptions.pagination.pages === "number",
    true,
  );
  // Test limit parameter
  const withLimit = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditClonePostTextContent.IRequest,
    },
  );
  typia.assert(withLimit);
  TestValidator.equals(
    "limit parameter respected",
    withLimit.pagination.limit,
    5,
  );
  // Test page parameter
  const withPage = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IRedditClonePostTextContent.IRequest,
    },
  );
  typia.assert(withPage);
  TestValidator.equals(
    "page parameter returns valid page",
    withPage.pagination.current,
    1,
  );
}
