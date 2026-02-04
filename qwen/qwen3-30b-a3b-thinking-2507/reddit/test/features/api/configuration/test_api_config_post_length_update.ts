import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_config_post_length_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin for configuration operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_user_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "securepassword123",
      display_name: RandomGenerator.name(2),
    },
  });
  // 2. Update the maximum post length configuration
  const updatedConfig =
    await api.functional.communityPlatform.user.configurations.patch(
      adminConnection,
      {
        body: {
          max_post_length: 2500,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  // 3. Validate the response
  typia.assert(updatedConfig);
  // 4. Validate the updated max_post_length
  const updatedMaxPostLength = (
    updatedConfig as {
      max_post_length?: number;
    }
  ).max_post_length;
  TestValidator.equals(
    "max_post_length should be 2500",
    updatedMaxPostLength,
    2500,
  );
}
