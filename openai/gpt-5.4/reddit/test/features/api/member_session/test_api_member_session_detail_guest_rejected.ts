import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_detail_guest_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  let sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    const accessToken = authorized.token.access;
    const payloadSegment = accessToken.split(".")[1] ?? "";
    const normalizedPayload = payloadSegment
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload =
      normalizedPayload + "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
    const payloadText = Buffer.from(paddedPayload, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(payloadText);
    if (typeof parsed === "object" && parsed !== null) {
      const payloadEntries = Object.entries(parsed);
      const candidate = payloadEntries
        .map(([, value]) => value)
        .find(
          (value): value is string =>
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              value,
            ),
        );
      if (candidate !== undefined) {
        sessionId = candidate;
      }
    }
  } catch {
    // keep fallback random UUID because the authorization check is the target
  }
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest cannot retrieve member session detail",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.sessions.at(
        guestConnection,
        {
          sessionId,
        },
      );
    },
  );
}
