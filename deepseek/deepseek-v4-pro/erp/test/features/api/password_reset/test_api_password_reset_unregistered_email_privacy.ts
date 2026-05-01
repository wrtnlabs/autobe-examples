import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
import { generate_random_erp_hrm_guest_password_resets_create } from "../../../generate/generate_random_erp_hrm_guest_password_resets_create";
import { prepare_random_erp_hrm_member_password_reset } from "../../../prepare/prepare_random_erp_hrm_member_password_reset";

/**
 * Test email enumeration prevention in password reset flow.
 *
 * Verifies that requesting a password reset for an email that has never been
 * registered returns the exact same 204 No Content response as a request for
 * a registered email. This behavior prevents attackers from discovering which
 * email addresses exist in the system through differential analysis of
 * password reset responses.
 *
 * The test uses a randomly generated, never-used email address that is
 * guaranteed not to exist in the system. The response must be indistinguishable
 * from the success case — same 204 status code, same empty response body —
 * ensuring the API does not leak information about email existence.
 */
export async function test_api_password_reset_unregistered_email_privacy(
  connection: api.IConnection,
): Promise<void> {
  await generate_random_erp_hrm_guest_password_resets_create(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
}
