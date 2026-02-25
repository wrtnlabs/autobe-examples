import { tags } from "typia";

import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "./IDiscussionBoardSuperAdmin";

export namespace IDiscussionBoardModeratedContentHistory {
  /**
   * Summary view of moderation log entries for administrative audit and compliance tracking. Provides essential information about moderation actions including action type, description, performer identity, and status. Used in moderation log listing operations where full details are not required.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property action_type
     */
    action_type: string;
    /**
     * @x-autobe-database-schema-property action_description
     */
    action_description: string;
    /**
     * @x-autobe-database-schema-property performed_at
     */
    performed_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property status
     */
    status: string;
    /**
     * @x-autobe-database-schema-property admin
     */
    admin: IDiscussionBoardAdmin.ISummary | null;
    /**
     * @x-autobe-database-schema-property superAdmin
     */
    super_admin: IDiscussionBoardSuperAdmin.ISummary | null;
  };

  /**
   * Search criteria and pagination parameters for filtering moderation logs. Allows administrators to search moderation activities by action type, administrator identity, target entities, time periods, and action status. Supports comprehensive audit trail analysis and compliance verification.
   */
  export type IRequest = {
    action_type?: string | undefined;
    admin_id?: (string & tags.Format<"uuid">) | null | undefined;
    super_admin_id?: (string & tags.Format<"uuid">) | null | undefined;
    target_article_id?: (string & tags.Format<"uuid">) | null | undefined;
    target_comment_id?: (string & tags.Format<"uuid">) | null | undefined;
    target_user_id?: (string & tags.Format<"uuid">) | null | undefined;
    target_section_id?: (string & tags.Format<"uuid">) | null | undefined;
    status?: string | undefined;
    action_description?: string | undefined;
    performed_at_from?: (string & tags.Format<"date-time">) | undefined;
    performed_at_to?: (string & tags.Format<"date-time">) | undefined;
    created_at_from?: (string & tags.Format<"date-time">) | undefined;
    created_at_to?: (string & tags.Format<"date-time">) | undefined;
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
