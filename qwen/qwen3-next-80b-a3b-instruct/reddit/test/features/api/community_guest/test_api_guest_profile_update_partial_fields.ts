import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityGuest.IJoin,
  });
  typia.assert(authResponse);
  // 2. Update profile with empty body since ICommunityMember.IUpdate is empty
  const updatedConnection: api.IConnection = { host: connection.host };
  updatedConnection.headers = guestConnection.headers; // Propagate authorized headers
  const updateBody = {} satisfies ICommunityMember.IUpdate;
  const updatedProfile = await api.functional.community.guest.profile.update(
    updatedConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 3. Validation cannot be performed on non-existent properties from schema
  // Since ICommunityMember.IUpdate and ICommunityMember are empty objects,
  // any property validation would violate the schema enforcement rule.
  // The test verifies the API call succeeds and the response validates
  // according to the provided schema, which is an empty object.
}
