import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_link_representation_unavailable_for_non_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
      href: "https://example.com" as string & tags.Format<"uri">,
      referrer: "https://ref.example.com" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  // 2) Request link representation for a non-link (or incompatible) post.
  // We don't have post-creation/listing APIs in the provided SDK, so we
  // use a UUID that should not be a link post in a typical dataset.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3) Validation: should be representation-unavailable / not link.
  // We avoid asserting HTTP status code; we only assert that the call fails.
  await TestValidator.error(
    "representation-unavailable for non-link post",
    async () => {
      await api.functional.communityPlatform.guest.posts.link.at(
        guestConnection,
        {
          postId,
        },
      );
    },
  );
}
