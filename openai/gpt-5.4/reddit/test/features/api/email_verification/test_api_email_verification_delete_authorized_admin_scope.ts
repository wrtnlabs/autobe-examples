import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_email_verification_delete_authorized_admin_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined admin email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "joined admin remains unverified initially",
    authorized.email_verified_at,
    null,
  );
  TestValidator.equals(
    "joined admin remains active",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "authorization header set from issued access token",
    adminConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.predicate(
    "issued admin id is non-empty",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "issued refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  const snapshotId = authorized.id;
  const snapshotEmail = authorized.email;
  const snapshotStatus = authorized.status;
  const snapshotEmailVerifiedAt = authorized.email_verified_at;
  const snapshotLastSignedInAt = authorized.last_signed_in_at;
  const snapshotCreatedAt = authorized.created_at;
  const snapshotUpdatedAt = authorized.updated_at;
  const snapshotDeletedAt = authorized.deleted_at;
  const snapshotAccessToken = authorized.token.access;
  await TestValidator.httpError(
    "deleting an unresolved email verification id should fail",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.email_verifications.erase(
        adminConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  TestValidator.equals(
    "admin id unchanged after failed deletion attempt",
    authorized.id,
    snapshotId,
  );
  TestValidator.equals(
    "admin email unchanged after failed deletion attempt",
    authorized.email,
    snapshotEmail,
  );
  TestValidator.equals(
    "admin status unchanged after failed deletion attempt",
    authorized.status,
    snapshotStatus,
  );
  TestValidator.equals(
    "admin email verification timestamp unchanged after failed deletion attempt",
    authorized.email_verified_at,
    snapshotEmailVerifiedAt,
  );
  TestValidator.equals(
    "admin sign-in timestamp unchanged after failed deletion attempt",
    authorized.last_signed_in_at,
    snapshotLastSignedInAt,
  );
  TestValidator.equals(
    "admin creation timestamp unchanged after failed deletion attempt",
    authorized.created_at,
    snapshotCreatedAt,
  );
  TestValidator.equals(
    "admin update timestamp unchanged after failed deletion attempt",
    authorized.updated_at,
    snapshotUpdatedAt,
  );
  TestValidator.equals(
    "admin deletion timestamp unchanged after failed deletion attempt",
    authorized.deleted_at,
    snapshotDeletedAt,
  );
  TestValidator.equals(
    "session authorization header preserved after failed deletion attempt",
    adminConnection.headers?.Authorization,
    snapshotAccessToken,
  );
}
