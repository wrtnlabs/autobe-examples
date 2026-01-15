import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid test data matching IJoin schema constraints
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`;
  const referrer = `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`;
  // Step 3: Execute member registration with valid data
  const registeredMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 4: Validate the response structure - typia.assert() validates ALL types completely
  typia.assert(registeredMember);
  // Step 5: Validate business logic - email should match input
  TestValidator.equals("email matches input", registeredMember.email, email);
}
