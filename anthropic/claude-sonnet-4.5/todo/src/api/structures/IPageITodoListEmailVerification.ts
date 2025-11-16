import { IPage } from "./IPage";
import { ITodoListEmailVerification } from "./ITodoListEmailVerification";

export namespace IPageITodoListEmailVerification {
  /**
   * Paginated collection of email verification record summaries.
   *
   * This response type wraps a list of email verification records with
   * pagination metadata, enabling efficient navigation through verification
   * history for user accounts. Used in user account management interfaces and
   * administrative verification monitoring endpoints.
   *
   * The pagination wrapper provides essential navigation information
   * including current page number, total record count, page size limits, and
   * total page count. This enables client applications to implement
   * pagination controls for browsing through verification attempts and
   * tracking verification completion status.
   *
   * Typically returned by email verification listing operations that support
   * filtering by verification status, expiration state, creation date, or
   * email address patterns. Essential for user account activation workflows
   * where users or administrators need to review pending verifications,
   * identify expired tokens, or audit verification completion history.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListEmailVerification.ISummary[];
  };
}
