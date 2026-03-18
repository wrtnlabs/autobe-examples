import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManagerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManagerSession";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_profile_update_rejects_non_personal_profile_context(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const canonicalBody = {
    displayName: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
    avatarImage: typia.random<string & tags.Format<"uri">>(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IHrmTimeTrackingManagerSession.IUpdate;
  const canonicalProfile =
    await api.functional.hrmTimeTracking.owner.profile.update(ownerConnection, {
      body: canonicalBody,
    });
  typia.assert(canonicalProfile);
  TestValidator.equals(
    "display name is saved to the canonical shared profile",
    canonicalProfile.displayName,
    canonicalBody.displayName,
  );
  TestValidator.equals(
    "avatar image is saved to the canonical shared profile",
    canonicalProfile.avatarImage,
    canonicalBody.avatarImage,
  );
  TestValidator.equals(
    "phone number is saved to the canonical shared profile",
    canonicalProfile.phoneNumber,
    canonicalBody.phoneNumber,
  );
  const alternateContextAttempt = {
    displayName: `${RandomGenerator.name()} organization-context-attempt`,
    avatarImage: null,
    phoneNumber: null,
  } satisfies IHrmTimeTrackingManagerSession.IUpdate;
  const afterAlternateAttempt =
    await api.functional.hrmTimeTracking.owner.profile.update(ownerConnection, {
      body: alternateContextAttempt,
    });
  typia.assert(afterAlternateAttempt);
  TestValidator.notEquals(
    "second update changes the same canonical profile instead of creating an alternate context",
    canonicalProfile,
    afterAlternateAttempt,
  );
  TestValidator.equals(
    "second update still targets the authenticated owner's canonical display name field",
    afterAlternateAttempt.displayName,
    alternateContextAttempt.displayName,
  );
  TestValidator.equals(
    "second update still targets the authenticated owner's canonical avatar field",
    afterAlternateAttempt.avatarImage,
    alternateContextAttempt.avatarImage,
  );
  TestValidator.equals(
    "second update still targets the authenticated owner's canonical phone field",
    afterAlternateAttempt.phoneNumber,
    alternateContextAttempt.phoneNumber,
  );
}
