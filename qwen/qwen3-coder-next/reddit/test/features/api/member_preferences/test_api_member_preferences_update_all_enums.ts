import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedPreference";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_preferences_update_all_enums(
  connection: api.IConnection,
): Promise<void> {
  // Register as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Create authenticated connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // Update preferences with all enum values
  const preferences =
    await api.functional.redditPlatform.member.preferences.update(
      authenticatedConnection,
      {
        body: {
          default_feed_type: "POPULAR",
          default_sort_order: "HOT",
          theme: "light",
          interface_density: "cozy",
          comment_sort_order: "CONVERSATION",
        } satisfies IRedditPlatformFeedPreference.IUpdate,
      },
    );
  typia.assert(preferences);
  // Validate all enum values are correctly set
  TestValidator.equals(
    "default_feed_type",
    preferences.defaultFeedType,
    "POPULAR",
  );
  TestValidator.equals(
    "default_sort_order",
    preferences.defaultSortOrder,
    "HOT",
  );
  TestValidator.equals("theme", preferences.theme, "light");
  TestValidator.equals(
    "interface_density",
    preferences.interfaceDensity,
    "cozy",
  );
  TestValidator.equals(
    "comment_sort_order",
    preferences.commentSortOrder,
    "CONVERSATION",
  );
}
