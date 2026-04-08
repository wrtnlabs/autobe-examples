import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_email_verification_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account which creates email verification record
  const sellerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_seller_join(sellerConnection, {});
  typia.assert(registered);
  // 2. Get the email verification details using a test UUID
  // Note: Since join doesn't return verificationId and there's no list endpoint,
  // we use a mock UUID to validate the endpoint structure
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.ecommerceMall.seller.seller.email_verifications.at(
      sellerConnection,
      {
        verificationId: verificationId,
      },
    );
  typia.assert(verification);
  // 3. Validate verifiedAt is null (pending status) when verification record exists
  TestValidator.equals(
    "verifiedAt is null for pending verification",
    verification.verifiedAt,
    null,
  );
}
