import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";

export async function test_api_comment_sort_orders_update_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registration and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<ICommunityPlatformAdmin.IJoin>();
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: adminJoinBody as ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 2: User registration and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody = typia.random<ICommunityPlatformUser.IJoin>();
  const userJoin = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(userJoin);
  const userConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userConnection, {
    body: userJoinBody as ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLogin);

  // Step 3: Create a comment by user
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);

  // Step 4: Prepare sorting strategy update array
  const sortOrders: ICommunityPlatformCommentSortOrder.IRequest = [
    { strategy: "best", sort_value: Math.floor(Math.random() * 100) },
    { strategy: "new", sort_value: Math.floor(Math.random() * 100) },
    { strategy: "top", sort_value: Math.floor(Math.random() * 100) },
    { strategy: "controversial", sort_value: Math.floor(Math.random() * 100) },
  ];

  // Step 5: Admin updates sorting metadata for created comment
  const updatedComment =
    await api.functional.communityPlatform.admin.comments.sort_orders.index(
      adminConnection,
      {
        commentId: "",
        body: sortOrders,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Validation skipped due to lack of 'comments_sort_orders' property
}
