import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunityActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunityActor";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_subscriber_count_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Use the established guest connection to retrieve subscriber count
  // Create a new connection with the authorization token from the guest authentication
  const subscriberConnection: api.IConnection = { host: connection.host };
  subscriberConnection.headers = { Authorization: guestAuth.token.access };
  // 3. Generate a valid community ID using the schema definition
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the subscriber count endpoint
  const subscriberCountData =
    await api.functional.community.guest.communities.subscriber_count.at(
      subscriberConnection,
      {
        communityId,
      },
    );
  typia.assert(subscriberCountData);
  // 5. Validate the response matches the expected schema: ICommunityCommunityActor
  TestValidator.equals(
    "community ID matches",
    subscriberCountData.id,
    communityId,
  );
  TestValidator.predicate(
    "creation timestamp is valid",
    new Date(subscriberCountData.created_at).toString() !== "Invalid Date",
  );
  // Ensure there's no redundant type validation after typia.assert()
  // typia.assert() already validated type, format, and structure completely
}
