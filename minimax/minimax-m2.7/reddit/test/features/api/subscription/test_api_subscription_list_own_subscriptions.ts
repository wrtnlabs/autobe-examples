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

export async function test_api_subscription_list_own_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Get own subscriptions with empty body
  const subscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditClonePostTextContent.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    subscriptions.pagination !== null && subscriptions.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has valid current",
    subscriptions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    subscriptions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    subscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    subscriptions.pagination.pages >= 0,
  );
  // 4. Validate data is array
  TestValidator.predicate("data is array", Array.isArray(subscriptions.data));
  // 5. Validate subscription summary structure (if any subscriptions exist)
  for (const subscription of subscriptions.data) {
    typia.assert(subscription);
    // Member details
    TestValidator.equals(
      "member id exists",
      subscription.member.id !== null && subscription.member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member username exists",
      subscription.member.username !== null &&
        subscription.member.username !== undefined,
      true,
    );
    // Community details
    TestValidator.equals(
      "community id exists",
      subscription.community.id !== null &&
        subscription.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community name exists",
      subscription.community.name !== null &&
        subscription.community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community description exists",
      subscription.community.description !== null &&
        subscription.community.description !== undefined,
      true,
    );
    TestValidator.predicate(
      "subscriber_count is valid",
      subscription.community.subscriber_count >= 0,
    );
    // Community owner
    TestValidator.equals(
      "community owner exists",
      subscription.community.owner !== null &&
        subscription.community.owner !== undefined,
      true,
    );
    // Timestamp
    TestValidator.equals(
      "created_at exists",
      subscription.created_at !== null && subscription.created_at !== undefined,
      true,
    );
  }
  // 6. Verify ordering by created_at descending (most recent first)
  if (subscriptions.data.length > 1) {
    for (let i = 1; i < subscriptions.data.length; i++) {
      const prev = new Date(subscriptions.data[i - 1].created_at).getTime();
      const curr = new Date(subscriptions.data[i].created_at).getTime();
      TestValidator.predicate(
        "subscriptions ordered by created_at descending",
        prev >= curr,
      );
    }
  }
}
