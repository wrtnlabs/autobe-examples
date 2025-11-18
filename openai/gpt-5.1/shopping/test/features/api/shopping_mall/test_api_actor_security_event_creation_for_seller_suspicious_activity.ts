import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_actor_security_event_creation_for_seller_suspicious_activity(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authenticated context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email: adminEmail,
    password: "P@ssw0rd!" as string & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Prepare suspicious seller activity security event payload
  const actorType = "seller";
  const eventType = "SUSPICIOUS_ACTIVITY";

  const suspiciousIp = typia.random<string & tags.Format<"ipv4">>();
  const userAgent = `Mozilla/5.0 (${RandomGenerator.name(2)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36`;

  const metadataObject = {
    suspected_reason: RandomGenerator.paragraph({ sentences: 3 }),
    orderCode: RandomGenerator.alphaNumeric(12),
    anomaly_score: 0.92,
  } as const;
  const metadataJson = JSON.stringify(metadataObject);

  const createBody = {
    actor_type: actorType,
    event_type: eventType,
    ip: suspiciousIp,
    user_agent: userAgent,
    metadata: metadataJson,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  // 3. Call the actor security event creation API
  const created: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(created);

  // 4. Validate core fields are preserved
  TestValidator.equals(
    "actor_type should be 'seller'",
    created.actor_type,
    actorType,
  );
  TestValidator.equals(
    "event_type should be 'SUSPICIOUS_ACTIVITY'",
    created.event_type,
    eventType,
  );
  TestValidator.equals(
    "ip should be persisted as provided",
    created.ip,
    suspiciousIp,
  );
  TestValidator.equals(
    "user_agent should be persisted as provided",
    created.user_agent,
    userAgent,
  );
  TestValidator.equals(
    "metadata string should be persisted as provided",
    created.metadata,
    metadataJson,
  );

  // 5. Optionally, decode metadata to validate structure
  if (created.metadata !== null && created.metadata !== undefined) {
    const parsed = JSON.parse(created.metadata) as {
      suspected_reason: string;
      orderCode: string;
      anomaly_score: number;
    };

    TestValidator.equals(
      "parsed metadata suspected_reason should match",
      parsed.suspected_reason,
      metadataObject.suspected_reason,
    );
    TestValidator.equals(
      "parsed metadata orderCode should match",
      parsed.orderCode,
      metadataObject.orderCode,
    );
    TestValidator.equals(
      "parsed metadata anomaly_score should match",
      parsed.anomaly_score,
      metadataObject.anomaly_score,
    );
  }
}
