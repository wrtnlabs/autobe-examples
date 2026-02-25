import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_with_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Prepare join body with null optional fields explicitly
  const body: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  };
  // Call moderator join utility function (must use utility function)
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body,
  });
  typia.assert(authorized);
  // Validate response structure and values
  TestValidator.predicate(
    "returned id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "returned token has access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "returned token has refresh token",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "returned token has expired_at",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "returned token has refreshable_until",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );
  // Confirm that null optional fields are properly accepted (they come back as undefined or null is allowed, but we must test that the system accepts them at create time)
  // Since the output structure doesn't include profile optional fields (only id and token), we can't validate them in response. This check is thus limited to no error thrown on nulls.
}
