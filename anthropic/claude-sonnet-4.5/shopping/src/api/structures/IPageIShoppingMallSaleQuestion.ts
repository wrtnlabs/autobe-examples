import { IPage } from "./IPage";
import { IShoppingMallSaleQuestion } from "./IShoppingMallSaleQuestion";

export namespace IPageIShoppingMallSaleQuestion {
  /**
   * Paginated collection of customer product questions with navigation
   * metadata.
   *
   * This response wrapper combines a list of question summaries with
   * pagination information, enabling efficient browsing of customer inquiries
   * about a product. Used when retrieving filtered and sorted question lists
   * for product detail pages, seller dashboards, or customer service
   * interfaces.
   *
   * The pagination structure supports various UI patterns including
   * traditional page-based navigation, infinite scroll implementations, and
   * load-more buttons. Clients can use the pagination metadata to display
   * page controls, show total question counts, and manage navigation state.
   *
   * Typically returned from search and filter operations on product
   * questions, this structure optimizes performance by limiting result set
   * size while providing complete pagination context. Essential for products
   * with extensive Q&A history where loading all questions at once would
   * impact performance and user experience.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing navigation information for the question
     * list.
     *
     * Contains essential pagination details including current page number,
     * page size limit, total record count, and total page count. This
     * metadata enables clients to implement pagination controls, display
     * page numbers, show total results, and navigate between pages of
     * product questions.
     *
     * Used by frontend components to render pagination UI elements such as
     * page number buttons, next/previous controls, and result count
     * displays. Essential for managing large question sets and providing
     * smooth user experience when browsing product Q&A sections.
     */
    pagination: IPage.IPagination;

    /**
     * Array of customer question summaries for the current page.
     *
     * Contains lightweight question representations optimized for list
     * display, including question content, buyer information, answer
     * status, and submission timestamps. Each item provides enough
     * information to render question cards in product Q&A sections without
     * requiring additional API calls.
     *
     * Typical page sizes range from 10 to 50 questions depending on UI
     * design. For products with no questions, this array will be empty. The
     * summary variant excludes full answer details to maintain performance;
     * clients should fetch individual questions for complete answer
     * threads.
     */
    data: IShoppingMallSaleQuestion.ISummary[];
  };
}
