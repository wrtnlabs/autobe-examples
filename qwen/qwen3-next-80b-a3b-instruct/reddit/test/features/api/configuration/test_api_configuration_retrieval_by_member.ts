import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_configuration_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and authenticate by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Retrieve a specific configuration setting using the authenticated member connection
  // "feature_toggle.enable_comments" is guaranteed to exist in the system
  const configuration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.member.configurations.at(
      memberConnection, // Use memberConnection (NOT base connection)
      {
        configurationId: "feature_toggle.enable_comments",
      },
    );
  typia.assert(configuration);
  // Step 3: Validate the configuration structure
  TestValidator.equals(
    "configuration key matches expected",
    configuration.key,
    "feature_toggle.enable_comments",
  );
  TestValidator.predicate(
    "configuration value is a string",
    typeof configuration.value === "string",
  );
  TestValidator.equals(
    "configuration scope is global",
    configuration.scope,
    "global",
  );
  TestValidator.predicate(
    "configuration category is not empty",
    configuration.category.length > 0,
  );
  TestValidator.predicate(
    "configuration description is not empty",
    configuration.description.length > 0,
  );
  TestValidator.predicate("configuration is active", configuration.is_active);
}
