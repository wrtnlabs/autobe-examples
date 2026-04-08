import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_optional_fields_null(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member without optional fields (avatar_uri and phone)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Retrieve the member profile
  const profile =
    await api.functional.erpHrm.member.profile.at(memberConnection);
  // Step 3: Validate response with typia (ensures type safety including null checks)
  typia.assert(profile);
  // Step 4: Validate that optional fields are null
  TestValidator.equals("avatar_uri should be null", profile.avatar_uri, null);
  TestValidator.equals("phone should be null", profile.phone, null);
  // Step 5: Validate required fields are present and valid
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "email is valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email),
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    typeof profile.display_name === "string" && profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    !isNaN(Date.parse(profile.updated_at)),
  );
}
