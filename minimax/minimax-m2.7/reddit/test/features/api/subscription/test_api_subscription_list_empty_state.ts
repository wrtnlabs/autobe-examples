import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create authenticated connection for the member
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Call GET /redditClone/member/subscriptions without any subscriptions
  const subscriptionList =
    await api.functional.redditClone.member.subscriptions.list(
      memberAuthConnection,
    );
  // 3. Validate response with typia.assert
  typia.assert(subscriptionList);
  // 4. Validate empty state
  TestValidator.equals(
    "data array should be empty",
    subscriptionList.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    subscriptionList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    subscriptionList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    subscriptionList.pagination.current,
    1,
  );
}
