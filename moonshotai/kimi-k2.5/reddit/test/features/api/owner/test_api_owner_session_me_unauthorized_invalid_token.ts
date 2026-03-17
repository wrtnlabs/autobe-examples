import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

(' * Test that session endpoint returns 401 Unauthorized when accessed with invalid or expired token.\n * Validates the authentication boundary - invalid/malformed tokens must be rejected.\n */\nexport async function test_api_owner_session_me_unauthorized_invalid_token(\n  connection: api.IConnection,\n): Promise<void> {\n  // Create a connection with an invalid/malformed JWT token\n  const invalidConnection: api.IConnection = {\n    host: connection.host,\n    headers: {\n      Authorization: ","\n    }\n  };\n\n  // Attempt to access the session endpoint with invalid token\n  // Expected: HTTP 401 Unauthorized error\n  await TestValidator.httpError(" ," 401, async () => {\n    await api.functional.redditLike.owner.sessions.me.at(invalidConnection);\n  });\n}');
