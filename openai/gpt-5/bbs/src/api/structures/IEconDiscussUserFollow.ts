import { tags } from "typia";

import { IEEconDiscussUserFollowSortBy } from "./IEEconDiscussUserFollowSortBy";
import { IESortOrder } from "./IESortOrder";

export namespace IEconDiscussUserFollow {
  /**
   * Request body for advanced follower search over
   * Actors.econ_discuss_user_follows.
   *
   * Supports pagination, basic text search (q), date range filters on
   * created_at, and ordering controls. Only active relationships (deleted_at
   * IS NULL) should be considered by the service.
   */
  export type IRequest = {
    /** Page number (1-based) for pagination. */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** Number of records per page. Service enforces sensible upper bounds. */
    pageSize: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>;

    /**
     * Optional free-text query to match follower display names (leverages
     * GIN trigram index on econ_discuss_users.display_name).
     */
    q?: string | null | undefined;

    /**
     * Filter followers created on/after this timestamp.
     *
     * Maps to econ_discuss_user_follows.created_at (timestamptz).
     */
    dateFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter followers created on/before this timestamp.
     *
     * Maps to econ_discuss_user_follows.created_at (timestamptz).
     */
    dateTo?: (string & tags.Format<"date-time">) | null | undefined;

    /** Sort field for follower listing. Default is created_at desc. */
    sortBy?: IEEconDiscussUserFollowSortBy | null | undefined;

    /** Sort direction (asc/desc). Default desc when sortBy is created_at. */
    order?: IESortOrder | null | undefined;
  };
}
