import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_blank_display_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create profile connection and get initial profile
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Test with empty string
  await TestValidator.error("empty string rejected", async () => {
    const response = await api.functional.redditPlatform.member.profile.put(
      profileConnection,
      {
        body: {
          display_name: "" satisfies string | undefined,
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
    typia.assert(response);
  });
  // 4. Test with whitespace-only string
  await TestValidator.error("whitespace-only string rejected", async () => {
    const response = await api.functional.redditPlatform.member.profile.put(
      profileConnection,
      {
        body: {
          display_name: "   " satisfies string | undefined,
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
    typia.assert(response);
  });
  // 5. Test with tabs and newlines
  await TestValidator.error("tabs and newlines rejected", async () => {
    const response = await api.functional.redditPlatform.member.profile.put(
      profileConnection,
      {
        body: {
          display_name: "\t\n\t" satisfies string | undefined,
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
    typia.assert(response);
  });
}